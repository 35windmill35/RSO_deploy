import Preloader from "@/SHARED/Preloader";
import { Suspense } from "react";

interface ISuspenseLayoutsProps {
  children?: React.ReactNode;
}

const SuspenseLayouts = ({ children }: ISuspenseLayoutsProps) => {
  return <Suspense fallback={<Preloader />}>{children}</Suspense>;
};

export default SuspenseLayouts;
