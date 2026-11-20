import RequireAuth from "../RequireAuth";

export const auth = (element: React.ReactNode) => {
  return <RequireAuth>{element}</RequireAuth>;
};
