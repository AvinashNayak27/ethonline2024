import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createThirdwebClient } from "thirdweb";
import { ThirdwebProvider } from "thirdweb/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Bets from "./components/Bets.jsx";
import History from "./components/History.jsx";
import Dashboard from "./components/dashboard.jsx";
import Landing from "./components/Landing.jsx";

export const client = createThirdwebClient({
  clientId: "55a6504e889b8d8708ede6dd50c2f831",
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThirdwebProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bets" element={<Bets />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </BrowserRouter>
    </ThirdwebProvider>
  </StrictMode>
);
