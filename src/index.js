import express from 'express'
import routes from './routes'
import middlewares from './routes/middlewares'
import dotenv from 'dotenv'
import colors from './colors'

dotenv.config()

const app = express()
async function launch() {
  middlewares(app) // Initialize middlewares
  routes(app) // Initialize routes

  app.listen(process.env.PORT, () => {
    console.log(`${colors.FgGreen + colors.Bright}Server on${colors.Reset}`)
  })
}

launch()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}