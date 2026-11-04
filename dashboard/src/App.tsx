import { BrowserRouter } from "react-router-dom";
import { Footer } from "./components/layout/Footer";
import { Navbar } from "./components/layout/Navbar";
import { Updates } from "./components/layout/Updates";
import { AppRouter } from "./router";
import "./App.scss";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Updates />
      <main>
        <AppRouter />
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
