import { WrapperProps } from '../../types/shared'
import { Auth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom';

const AdminRoute = ({children}: WrapperProps) => {
    const { session, role, loading} = Auth();

    if (session === undefined || loading) {
        return <p>Loading...</p>;
    }

    if (!session) return <Navigate to="/" />;
    
    if (role !== 'admin') return <Navigate to="/" />;

    return <>{children}</>;
}

export default AdminRoute;