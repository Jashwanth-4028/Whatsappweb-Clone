import { useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await register({
  name,
  email,
  password,
  ...(phone ? { phone } : {}),
});
      navigate("/", { replace: true });
    } catch (err) {
      const axErr = err as AxiosError<{ error?: string }>;
      setError(axErr.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p>Set up your professional chat profile</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
        <button type="submit">Register</button>
        {error ? <div className="error">{error}</div> : null}
        <small>
          Already have an account? <Link to="/login">Login</Link>
        </small>
      </form>
    </div>
  );
};

export default RegisterPage;
