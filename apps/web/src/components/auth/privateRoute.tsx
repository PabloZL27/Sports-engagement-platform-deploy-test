import { WrapperProps } from '../../types/shared'
import { Auth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({children}: WrapperProps) => {
    const { session } = Auth();

    if (session === undefined) {
        return <p>Loading...</p>;
    }

    return (<>{session ? <>{children}</> : <Navigate to="/" />}</>)
}

export default PrivateRoute;
