import axios from 'axios'

export default ({ req }) => {
  if (typeof window === 'undefined') {
    return axios.create({
      baseURL: 'http://54.169.175.114',
      headers: req.headers
    })
  } else {
    return axios.create({
      baseUrl: '/'
    })
  }
}
