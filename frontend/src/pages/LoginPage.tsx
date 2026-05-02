import { useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const axErr = err as AxiosError<{ error?: string }>;
      setError(axErr.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Welcome Back</h1>
        <p>Log in to your messaging account</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
        <button type="submit">Login</button>
        {error ? <div className="error">{error}</div> : null}
        <small>
          New here? <Link to="/register">Create account</Link>
        </small>
      </form>
    </div>
  );
};

export default LoginPage;
