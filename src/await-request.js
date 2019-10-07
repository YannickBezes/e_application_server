// await-request.js
import request from 'request'
import iconv from 'iconv-lite'

export default async url => {
  return new Promise((resolve, reject) => {
    request(url, (error, response, data) => {
      if (!error && response.statusCode == 200) {
        // Convert ISO to utf8
        resolve(iconv.decode(new Buffer(data), "ISO-8859-1"))
      } else reject(error)
    })
  })
}