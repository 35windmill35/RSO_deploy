import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Preloader from "@/SHARED/Preloader";
import { useTranslation } from "react-i18next";
import { isLanguageSupport } from "@/APP/i18n/utils";
import store from "@/APP/store/root";

interface IProps {
  children: React.ReactNode;
}

const CheckAuthByUrl = ({ children }: IProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const checkLocalSessionId = async (): Promise<boolean> => {
      const sessionId = store.auth.sessionId;
      const isCheck = await store.auth.checkSessionId(sessionId);
      return isCheck;
    };

    const initializeAuth = async () => {
      const isLocalCheck = await checkLocalSessionId();
      if (isLocalCheck) {
        setIsInitializing(false);
        return;
      }
      const searchParams = new URLSearchParams(location.search);
      const sessionId = searchParams.get("SESSIONID");
      const url = searchParams.get("url");
      const language = searchParams.get("language");
      try {
        if (!sessionId) {
          store.auth.reset();
          return;
        }
        const isCheck = await store.auth.checkSessionId(sessionId);
        if (!isCheck) {
          store.auth.reset();
          return;
        }
        store.auth.setLogoutUrl(url);
        if (language && isLanguageSupport(language)) i18n.changeLanguage(language);
        navigate({ pathname: "/", search: "" }, { replace: true });
      } catch (error) {
        store.auth.reset();
        navigate({ pathname: "/login", search: "" }, { replace: true });
      } finally {
        setIsInitializing(false);
      }
    };
    void initializeAuth();
  }, [location.search, navigate]);

  return <>{isInitializing ? <Preloader /> : children}</>;
};

export default CheckAuthByUrl;
