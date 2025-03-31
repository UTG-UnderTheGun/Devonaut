import axios from 'axios'

export default ({ req }) => {
  if (typeof window === 'undefined') {
    return axios.create({
      baseURL: 'http://13.229.116.7',
      headers: req.headers
    })
  } else {
    return axios.create({
      baseUrl: '/'
    })
  }
}
