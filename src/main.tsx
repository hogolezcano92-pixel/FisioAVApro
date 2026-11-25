import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import PatientPortal from './PatientPortal';
import './index.css';

const isPatientPortal = window.location.pathname.replace(/\\/+$/, '') === '/paciente';
createRoot(document.getElementById('root')!).render(isPatientPortal ? <PatientPortal /> : <App />);
