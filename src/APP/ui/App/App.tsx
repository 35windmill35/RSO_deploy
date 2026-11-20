import AppRouter from "@/APP/routers/AppRouter";
import SuspenseLayouts from "./components/SuspenseLayouts";
import { BrowserRouter } from "react-router-dom";
import { BASENAME } from "@/APP/clients";
import CheckAuthByUrl from "./components/CheckAuthByUrl";

function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <SuspenseLayouts>
        <CheckAuthByUrl>
          <div className="ts_dashboard">
            <AppRouter />
          </div>
        </CheckAuthByUrl>
      </SuspenseLayouts>
    </BrowserRouter>
  );
}

export default App;
