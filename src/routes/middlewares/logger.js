export default (req, res, next) => {
  console.log(`HIT - (${req.method}) ${req.originalUrl}`)
  next()
}