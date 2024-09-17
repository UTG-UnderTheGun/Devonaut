import GlassBox from "@/components/glass-box";
import './login.css'
import Link from "next/link";

export default function Login() {
  return (
    <div className="bg-cover bg-center min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/Login.png')` }}>
      <GlassBox size={{ minWidth: '450px' }}>
        <div className="login-form-container">
          <div className="login-image-container">
            <img
              src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/hxvq5wvnp4xbxtnl7rrn"
              alt="Profile"
              width={100}
              height={100}
            />
          </div>
          <div className="login-text">
            <h1><strong>Log in</strong></h1>
          </div>
          <div className="login-form">
            <form>
              <div className="login-container">
                <div className="login-username">
                  <div>
                    <label>Username</label>
                  </div>
                  <div>
                    <input type="text" name="username" />
                  </div>
                </div>
                <div className="login-password">
                  <div>
                    <label>Password</label>
                  </div>
                  <div>
                    <input type="password" name="password" />
                  </div>
                </div>
                <div className="login-btn">
                  <button>Login</button>
                </div>
                <div className="link-register">
                  or&nbsp;<Link style={{ color: "#398EE9" }} href='signup'>register</Link>
                </div>
                <hr />
              </div>
            </form>
          </div>
          <div className="authgmail-container">
            <div className="login-gmail">
              <img src='/gmaillogo.png' />
              <button>Login with Gmail</button>
            </div>
          </div>
        </div>
      </GlassBox>
    </div >
  )
}
