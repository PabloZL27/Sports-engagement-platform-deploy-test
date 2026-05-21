import { WrapperProps } from '../../types/shared'
import { Auth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom';

const UserRoute = ({children}: WrapperProps) => {
    const { session, role, loading } = Auth();

    if (session === undefined || loading) {
        return <p>Loading...</p>;
    }

    if (role === 'admin') return <Navigate to="/admin" />;

    return <>{children}</>;
}

export default UserRoute;