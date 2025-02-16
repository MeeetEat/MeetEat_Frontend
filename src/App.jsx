import "./App.css";
import { BrowserRouter } from "react-router-dom";
import Router from "./router/router";
import Modal from './components/modal/ModalContainer.jsx';

function App() {
  return (
    <BrowserRouter>
      <section className="relative flex flex-col items-center w-screen h-screen
      sm:justify-center
      ">
        <Router />
      </section>
      <Modal/>
    </BrowserRouter>
  );
}

export default App;
