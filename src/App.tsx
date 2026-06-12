import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreContext, useStoreState } from './store/useStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Disputes from './pages/Disputes';
import Letters from './pages/Letters';
import Accounts from './pages/Accounts';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';

function AppRoutes() {
  const store = useStoreState();
  return (
    <StoreContext.Provider value={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/letters" element={<Letters />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreContext.Provider>
  );
}

export default AppRoutes;
