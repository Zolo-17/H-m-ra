import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import PaymentManual from "./PaymentManual.jsx";
import AdminApprovals from "./AdminApprovals.jsx";

function Root() {
  const path = window.location.pathname;
  if (path.startsWith("/paiement")) return <PaymentManual />;
  if (path.startsWith("/admin")) return <AdminApprovals />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

