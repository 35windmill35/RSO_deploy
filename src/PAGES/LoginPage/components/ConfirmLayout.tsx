import { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import classes from "./styles.module.scss";
import { validationCodeConfirm } from "../utils/validation";
import Timer from "@/SHARED/Timer";
import type { IResponseAPI } from "@/API/types/IResponseAPI";
import store from "@/APP/store/root";

const ConfirmLayout = observer(() => {
  const { t } = useTranslation();
  const [code, setCode] = useState(["", "", "", ""]);
  const [timeUP, setTimeUP] = useState(false);
  const [disable, setDisable] = useState(true);
  const [seconds, setSeconds] = useState(store.auth.timeLeft);
  const codesRef = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    codesRef.current[0]?.focus();
  }, []);

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "ArrowLeft") {
      if (index > 0) {
        codesRef.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowRight") {
      if (index < 3) {
        codesRef.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const num = parseInt(e.target.value, 10);
    if (isNaN(num)) return;
    const value = [...code];
    if (e.target.value.length === 4) {
      value[0] = e.target.value[0];
      value[1] = e.target.value[1];
      value[2] = e.target.value[2];
      value[3] = e.target.value[3];
      btnRef.current?.focus();
    } else {
      value[index] = e.target.value[0];
      if (index < 3) {
        codesRef.current[index + 1]?.focus();
        codesRef.current[index + 1]?.select();
      } else btnRef.current?.focus();
    }
    const valid = validationCodeConfirm(value);
    setDisable(!valid);
    setCode(value);
  };

  const handleTimeUpClick = async () => {
    setDisable(true);
    setTimeUP(false);
    setCode(["", "", "", ""]);
    await store.auth.registration(store.auth.phone);
    setSeconds(store.auth.timeLeft);
    codesRef.current[0]?.focus();
  };

  const handleTimeUp = () => {
    setDisable(true);
    setTimeUP(true);
  };

  const handleClick = (index: number) => {
    codesRef.current[index]?.select();
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const valid = validationCodeConfirm(code);
    setDisable(!valid);
    if (!valid) return;
    const result = await store.auth.registrationConfirm(code.join(""));
    checkConfirmResult(result);
  };

  const checkConfirmResult = (result: IResponseAPI | null) => {
    switch (result?.result.Status) {
      case 0:
        store.auth.setPage("UserPassword");
        return;
      case 26:
        store.auth.setPage("Registration");
        return;
      case 27:
        setCode(["", "", "", ""]);
        codesRef.current[0]?.focus();
        return;
    }
  };

  return (
    <div className={classes.wrapper}>
      <form className={classes.form} onSubmit={handleSubmit}>
        <h1 className={classes.title}>{t("inputSmsCode")}</h1>
        <div className={classes.code_container}>
          {code.map((code, index) => (
            <input
              key={index}
              onClick={() => handleClick(index)}
              ref={(el) => {
                codesRef.current[index] = el;
              }}
              className={classes.input_code}
              onChange={(e) => handleCodeChange(e, index)}
              value={code}
              type="tel"
              maxLength={4}
              minLength={1}
              onKeyDown={(e) => handleCodeKeyDown(e, index)}
            />
          ))}
        </div>
        <div className={classes.btn_container}>
          <button
            className={classes.submit}
            disabled={disable || store.auth.isLoading}
            type="submit"
            ref={btnRef}
          >
            {store.auth.isLoading ? t("checking") : t("send")}
          </button>
          <button
            className={classes.request_btn}
            disabled={!timeUP || store.auth.isLoading}
            onClick={handleTimeUpClick}
          >
            <span>{t("sendCodeAgain")}</span>
            {!timeUP && (
              <span>
                {t("after")} <Timer onTimeup={handleTimeUp} count={seconds} /> {t("sec")}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
});

export default ConfirmLayout;
