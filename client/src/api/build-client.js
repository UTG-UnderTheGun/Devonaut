import axios from 'axios'

export default ({ req }) => {
  if (typeof window === 'undefined') {
    return axios.create({
      baseURL: 'https://www.mari0nette.com',
      headers: req.headers
    })
  } else {
    return axios.create({
      baseUrl: '/'
    })
  }
}
