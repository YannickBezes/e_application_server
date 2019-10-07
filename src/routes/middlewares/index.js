import bodyParser from 'body-parser'
import logger from './logger'
import express from 'express'
// import cors from 'cors'

export default (app) => {
	// app.use(cors())
	app.use(logger)
	app.use(express.json())
	app.use(bodyParser.urlencoded({
		extended: true
	}))
}