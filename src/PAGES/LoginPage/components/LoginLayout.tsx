import classes from "./styles.module.scss";
import { useEffect, useRef, useState } from "react";
import { validationPhone } from "@/APP/store/utils/validationPhone";
import { validationLoginData } from "../utils/validation";
import { PasswordInput } from "@/SHARED/PasswordInput/PasswordInput";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import store from "@/APP/store/root";

interface IProps {
  onAuth: () => void;
}

const LoginLayout = observer(({ onAuth }: IProps) => {
  const { t } = useTranslation();
  const [disable, setDisable] = useState(true);
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPhone(validationPhone(store.auth.phone));
    setPassword(store.auth.password);
    setDisable(!validationLoginData(store.auth.phone, store.auth.password));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    store.auth.setError(null);
  }, []);

  const handleLinkClick = () => {
    store.auth.setPage("Registration");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value || e.target.value === "+") {
      setPhone("");
      setDisable(true);
      return;
    }
    const value = validationPhone(e.target.value);
    setPhone(value);
    setDisable(!validationLoginData(value, password));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setDisable(!validationLoginData(phone, value));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validationLoginData(phone, password)) {
      setDisable(true);
      return;
    }
    const success = await store.auth.login(phone, password);
    if (success) onAuth();
  };

  return (
    <div className={classes.wrapper}>
      <form className={classes.form} onSubmit={handleSubmit}>
        <h1 className={classes.title}>{t("dashboards")}</h1>

        <label className={classes.field}>
          <span className={classes.label}>{t("phone")}</span>
          <input
            ref={inputRef}
            className={classes.input}
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            autoComplete="tel"
            required
          />
        </label>

        <label className={classes.field}>
          <span className={classes.label}>{t("password")}</span>
          <PasswordInput
            className={classes.input}
            value={password}
            onChange={handlePasswordChange}
            autoComplete="current-password"
            required
          />
        </label>

        {store.auth.error && <p className={classes.error}>{store.auth.error}</p>}

        <button className={classes.submit} type="submit" disabled={store.auth.isLoading || disable}>
          {store.auth.isLoading ? t("logining") : t("login")}
        </button>

        <button onClick={handleLinkClick} className={classes.registerLink}>
          {t("label.registration")}
        </button>
      </form>
    </div>
  );
});

export default LoginLayout;
