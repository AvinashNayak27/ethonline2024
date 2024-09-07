import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { createThirdwebClient } from "thirdweb";
import { ThirdwebProvider } from "thirdweb/react";

export const client = createThirdwebClient({
  clientId: "55a6504e889b8d8708ede6dd50c2f831",
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThirdwebProvider client={client}>
      <App />
    </ThirdwebProvider>
  </StrictMode>
);
