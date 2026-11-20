import store from "@/APP/store/root";
import { observer } from "mobx-react-lite";
import { Navigate, useLocation } from "react-router-dom";

interface IProps {
  children: React.ReactNode;
}

const RequireAuth = observer(({ children }: IProps) => {
  const location = useLocation();
  return (
    <>
      {store.auth.isAuthenticated ? (
        children
      ) : (
        <Navigate to={"/login"} state={{ from: location }} replace />
      )}
    </>
  );
});

export default RequireAuth;
