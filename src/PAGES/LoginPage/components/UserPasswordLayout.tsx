import classes from "./styles.module.scss";
import { useTranslation } from "react-i18next";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { PasswordInput } from "@/SHARED/PasswordInput/PasswordInput";
import { validatorPassword } from "../utils/validation";
import store from "@/APP/store/root";

interface IProps {
  onAuth: () => void;
}
const UserPasswordLayout = observer(({ onAuth }: IProps) => {
  const [disable, setDisable] = useState(true);
  const [password, setPassword] = useState<string>("");
  const [passwordValid, setPasswordValid] = useState<string>("");
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    store.auth.setError(null);
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const valid = validatorPassword(value);
    if (valid) setError("");
    else setError(t("passwordInvalid"));
    setPassword(value);
    if (!valid || value !== passwordValid) setDisable(true);
    else setDisable(false);
  };

  const handlePasswordValidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== password || error) setDisable(true);
    else setDisable(false);
    setPasswordValid(value);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const success = await store.auth.changePassword(password);
    if (success) onAuth();
  };

  return (
    <div className={classes.wrapper}>
      <form className={classes.form} onSubmit={handleSubmit}>
        <h1 className={classes.title}>{t("dashboards")}</h1>
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
        <label className={classes.field}>
          <span className={classes.label}>{t("passwordRepeat")}</span>
          <PasswordInput
            className={classes.input}
            value={passwordValid}
            onChange={handlePasswordValidChange}
            autoComplete="current-password"
            required
          />
        </label>

        {(store.auth.error || error) && (
          <p className={classes.error}>{store.auth.error || error}</p>
        )}

        <button className={classes.submit} type="submit" disabled={store.auth.isLoading || disable}>
          {store.auth.isLoading ? t("saving") : t("passwordSave")}
        </button>
      </form>
    </div>
  );
});

export default UserPasswordLayout;
