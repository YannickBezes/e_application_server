import fs from 'fs'
import Word from './Word'
import Autocomplete from './Autocomplete'

export default app => {
  app.get('/:word/autocomplete', (req, res) => Autocomplete.get(req, res))
  app.get('/:word/definitions', (req, res) => Word.get_def(req, res))
  app.get('/:word/:rel', (req, res) => Word.get_word(req, res))
}