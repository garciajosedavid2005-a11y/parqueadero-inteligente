import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { VisorProvider } from './components/VisorImagen';
import { SesionProvider } from './context/SesionContext';
import Activos from './pages/Activos';
import Historial from './pages/Historial';
import NoEncontrado from './pages/NoEncontrado';
import Registro from './pages/Registro';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SesionProvider>
        <VisorProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Registro />} />
              <Route path="activos" element={<Activos />} />
              <Route path="historial" element={<Historial />} />
              <Route path="*" element={<NoEncontrado />} />
            </Route>
          </Routes>
        </VisorProvider>
      </SesionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
