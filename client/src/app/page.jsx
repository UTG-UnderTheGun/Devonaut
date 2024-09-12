export default function Home() {
    return (
      <div
        className="bg-cover bg-center min-h-screen flex items-center justify-center"
        style={{ backgroundImage: `url('https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/uy1kwt2wvxjwhq9sxa2x')` }}
      >
        <div className="chat-container w-full max-w-md rounded-3xl shadow-lg flex flex-col p-6 space-y-6 opacity-100 backdrop-blur-md">
          <div className="flex justify-center -mb-3">
            <img
              src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/hxvq5wvnp4xbxtnl7rrn"
              alt="Profile"
              width={100}
              height={100}
            />
          </div>
          <div className="text-center text-xl font-bold text-black">Log In</div>
          <div className="flex flex-col space-y-2 mx-10">
            <label className="text-md text-black">Username</label>
            <input
              type="text"
              className="p-3 border border-pink-700 rounded-3xl focus:outline-none focus:border-pink-500 bg-fuchsia-300"
            />
          </div>
          <div className="flex flex-col space-y-2 mx-10">
            <label className="text-md text-black">Password</label>
            <input
              type="password"
              className="p-3 border border-pink-700 rounded-3xl focus:outline-none focus:border-pink-500 bg-fuchsia-300"
            />
          </div>
          <div className="flex justify-center">
            <a href="/code">
            <button className="bg-fuchsia-300 text-black font-semibold py-2 px-10 rounded-3xl hover:bg-pink-600">
              LOG IN
            </button></a>
            
          </div>
          <p className="text-center text-sm relative text-black cursor-pointer hover:underline hover:underline-offset-3 transition duration-300 ease-in-out">
            Register
          </p>
          <div className="py-2 bg-white rounded-lg mx-20 font-normal cursor-pointer ">
            <img src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/dzlflqf5xiqjay0jg26p" alt="" width={35} height={25} className="absolute -mt-1"/>
            <p className="text-center text-black">Login With Gmail</p>
          </div>
        </div>
      </div>
    );
  }
  