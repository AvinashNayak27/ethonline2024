import React, { useState, useEffect } from "react";
import { loadGapiInsideDOM, loadAuth2 } from "gapi-script";
import "./App.css";
import "tailwindcss/tailwind.css";


const UserCard = (props) => {
  const getDate = (index) => {
    const date = new Date();
    date.setDate(date.getDate() - (7 - index)); // Calculate the date for each step entry
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 bg-white rounded shadow-md">
      <img
        className="w-24 h-24 rounded-full mt-2 mx-auto"
        src={props.user.profileImg}
        alt="user profile"
      />
      <h2 className="text-xl text-center font-bold mt-2">{props.user.name}</h2>

      <div className="mt-4">
        <h3 className="text-lg font-semibold">Step Count (Last 7 Days):</h3>
        <ul className="list-disc list-inside">
          {props.user.steps.map((step, index) => (
            <li key={index}>
              {getDate(index)}: {step} steps
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const GoogleLogin = () => {
  const [user, setUser] = useState(null);
  const [gapi, setGapi] = useState(null);
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const loadGapi = async () => {
      try {
        const newGapi = await loadGapiInsideDOM();
        setGapi(newGapi);
      } catch (error) {
        console.error("Error loading GAPI:", error);
      }
    };
    loadGapi();
  }, []);

  useEffect(() => {
    if (!gapi) return;


    const setAuth2 = async () => {
      try {
        const auth2 = await loadAuth2(
          gapi,
          GOOGLE_CLIENT_ID,
          "",
          {
            scope:
              "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.location.read",
          }
        );

        if (auth2.isSignedIn.get()) {
          updateUser(auth2.currentUser.get());
        } else {
          attachSignin(document.getElementById("customBtn"), auth2);
        }
      } catch (error) {
        console.error("Error setting up auth2:", error);
      }
    };
    setAuth2();
  }, [gapi]);

  const updateUser = (googleUser) => {
    const profile = googleUser.getBasicProfile();
    const name = profile.getName();
    const profileImg = profile.getImageUrl();

    setUser({
      name: name,
      profileImg: profileImg,
      steps: [],
    });

    fetchFitnessData(googleUser);
  };

  const attachSignin = (element, auth2) => {
    auth2.attachClickHandler(
      element,
      {},
      (googleUser) => {
        updateUser(googleUser);
      },
      (error) => {
        console.error("Error attaching sign-in:", error);
      }
    );
  };

  const fetchFitnessData = async (googleUser) => {
    const authResponse = googleUser.getAuthResponse(true); // true for immediate access to updated auth token
    const accessToken = authResponse.access_token;

    if (!accessToken) {
      console.error("Access token is missing.");
      return;
    }

    try {
      const response = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aggregateBy: [
              {
                dataTypeName: "com.google.step_count.delta",
                dataSourceId:
                  "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
              },
            ],
            bucketByTime: { durationMillis: 86400000 }, // 1 day
            startTimeMillis:
              new Date(new Date().setHours(0, 0, 0, 0)).getTime() -
              7 * 86400000, // start of the day 7 days ago
            endTimeMillis: new Date(
              new Date().setHours(23, 59, 59, 999)
            ).getTime(), // end of the current day
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching fitness data:", errorData);
        return;
      }

      const fitnessData = await response.json();
      console.log(fitnessData);
      const steps = fitnessData.bucket.map((bucket) => {
        const stepCount = bucket.dataset[0].point.reduce(
          (total, point) => total + point.value[0].intVal,
          0
        );
        return stepCount;
      });

      setUser((prevUser) => ({
        ...prevUser,
        steps: steps,
      }));

      console.log("Fitness Data:", fitnessData);
    } catch (error) {
      console.error("Error fetching fitness data:", error);
    }
  };

  const signOut = () => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      setUser(null);
      console.log("User signed out.");
    });
  };

  if (user) {
    return (
      <div className="container mx-auto p-4">
        <UserCard user={user} />
        <div
          id=""
          className="btn logout mt-4 p-2 bg-red-500 text-white rounded cursor-pointer"
          onClick={signOut}
        >
          Logout
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div
        id="customBtn"
        className="btn login p-2 bg-blue-500 text-white rounded cursor-pointer"
      >
        Login
      </div>
    </div>
  );
};

export default GoogleLogin;
