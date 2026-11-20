import classes from "./styles.module.scss";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { validationRegistrationData } from "../utils/validation";
import { validationPhone } from "@/APP/store/utils/validationPhone";
import { observer } from "mobx-react-lite";
import store from "@/APP/store/root";

const RegistrationLayout = observer(() => {
  const [disable, setDisable] = useState(true);
  const [phone, setPhone] = useState<string>("");
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    store.auth.setError(null);
  }, []);

  const handleLinkClick = () => {
    store.auth.setPage("Login");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value || e.target.value === "+") {
      setPhone("");
      setDisable(true);
      return;
    }
    const value = validationPhone(e.target.value);
    setPhone(value);
    setDisable(!validationRegistrationData(value));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validationRegistrationData(phone)) {
      setDisable(true);
      return;
    }
    const success = await store.auth.registration(phone);
    if (success) store.auth.setPage("Confirm");
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

        {store.auth.error && <p className={classes.error}>{store.auth.error}</p>}

        <button className={classes.submit} type="submit" disabled={store.auth.isLoading || disable}>
          {store.auth.isLoading ? t("registering") : t("registration")}
        </button>

        <button onClick={handleLinkClick} className={classes.registerLink}>
          {t("label.login")}
        </button>
      </form>
    </div>
  );
});

export default RegistrationLayout;
