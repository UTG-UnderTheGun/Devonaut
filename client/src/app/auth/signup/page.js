import GlassBox from "@/components/glass-box";
import './register.css'
import Link from "next/link";

export default function register() {
  return (
    <div className="bg-cover bg-center min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/login.png')` }}>
      <GlassBox size={{ minWidth: '450px' }}>
        <div className="register-form-container">
          <div className="register-image-container">
            <img
              src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/hxvq5wvnp4xbxtnl7rrn"
              alt="Profile"
              width={100}
              height={100}
            />
          </div>
          <div className="register-text">
            <h1><strong>Register</strong></h1>
          </div>
          <div className="register-form">
            <form>
              <div className="register-container">
                <div className="register-email">
                  <div>
                    <label>Email</label>
                  </div>
                  <div>
                    <input type="email" name="email" required />
                  </div>
                </div>
                <div className="register-username">
                  <div>
                    <label>Username</label>
                  </div>
                  <div>
                    <input type="text" name="username" required />
                  </div>
                </div>
                <div className="register-password">
                  <div>
                    <label>Password</label>
                  </div>
                  <div>
                    <input type="password" name="password" required />
                  </div>
                </div>
                <div className="register-btn">
                  <button>register</button>
                </div>
                <div className="link-login">
                  go to&nbsp;<Link style={{ color: "#398EE9" }} href='login'>Login</Link>
                </div>
                <hr />
              </div>
            </form>
          </div>
          <div className="authgmail-container">
            <div className="register-gmail">
              <img src='/gmaillogo.png' />
              <button>register with Gmail</button>
            </div>
          </div>
        </div>
      </GlassBox>
    </div >
  )
}
