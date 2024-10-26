import ReactDOM from 'react-dom/client';
import Sidebar from './Sidebar';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(<Sidebar />);
