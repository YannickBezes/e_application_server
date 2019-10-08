import fs from 'fs'
import Word from './Word'

export default app => {
  app.get('/:word/definitions', (req, res) => Word.get_def(req, res))
  app.get('/:word/:rel', (req, res) => Word.get_word(req, res))
}