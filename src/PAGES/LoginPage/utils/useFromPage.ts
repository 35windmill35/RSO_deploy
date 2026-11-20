import { useLocation } from "react-router-dom";

const useFromPage = (): string => {
  const location = useLocation();
  const fromPage = location.state?.from?.pathname || "/";
  return fromPage as string;
};

export default useFromPage;
