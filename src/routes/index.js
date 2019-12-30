import Word from './Word'
import Autocomplete from './Autocomplete'

export default app => {
  app.get('/:word/autocomplete', (req, res) => Autocomplete.get(req, res))
  app.get('/:word/definitions', (req, res) => Word.get_def(req, res))
  // app.get('/:word/:rel', (req, res) => Word.get_word(req, res))
  app.get('/:word/:rel/:limit*?', (req, res) => Word.get_word(req, res))

  // DEFAULT request
  app.use((req, res) => {
    res.json({
      status: "failed",
      data: null,
      message: 'Error can\'t find a endpoint for ' + req.method + ' ' + req.url
    })
  })
}