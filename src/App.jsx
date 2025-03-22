import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/login';
import SignUp from './components/newuser';
import IntroductionPage from './components/introductionPage';
import Enter from './components/enter';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ent" element={<Enter />} />
        <Route path="/main" element={<IntroductionPage />} />
      </Routes>
    </Router>
  );
}

export default App;



