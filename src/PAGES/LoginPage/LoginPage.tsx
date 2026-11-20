import classes from "./LoginPage.module.scss";
import { observer } from "mobx-react-lite";
import LoginLayout from "./components/LoginLayout";
import RegistrationLayout from "./components/RegistrationLayout";
import UserPasswordLayout from "./components/UserPasswordLayout";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useFromPage from "./utils/useFromPage";
import ConfirmLayout from "./components/ConfirmLayout";
import store from "@/APP/store/root";

const LoginPage = observer(() => {
  const navigate = useNavigate();
  const fromPage = useFromPage();

  useEffect(() => {
    store.auth.readDbGuid();
  }, []);

  const handleAuth = () => {
    navigate(fromPage);
  };

  return (
    <div className={classes.authPage}>
      {store.auth.page === "Login" && <LoginLayout onAuth={handleAuth} />}
      {store.auth.page === "Registration" && <RegistrationLayout />}
      {store.auth.page === "Confirm" && <ConfirmLayout />}
      {store.auth.page === "UserPassword" && <UserPasswordLayout onAuth={handleAuth} />}
    </div>
  );
});

export default LoginPage;
