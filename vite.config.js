import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

function statementDbSavePlugin() {
  return {
    name: 'statement-db-save-plugin',
    configureServer(server) {
      server.middlewares.use('/api/statement-db/save', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let rawBody = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => {
          rawBody += chunk
        })

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(rawBody || '{}')
            const fileName =
              typeof parsed.fileName === 'string' && parsed.fileName.trim()
                ? parsed.fileName.trim()
                : 'data/statement-db.json'
            const content = typeof parsed.content === 'string' ? parsed.content : ''

            if (!content) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: 'Conteudo vazio.' }))
              return
            }

            const publicRoot = path.resolve(process.cwd(), 'public')
            const targetPath = path.resolve(publicRoot, fileName.replace(/^[/\\]+/, ''))
            const publicRootPrefix = `${publicRoot}${path.sep}`
            if (!(targetPath === publicRoot || targetPath.startsWith(publicRootPrefix))) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: 'Caminho invalido.' }))
              return
            }

            await fs.mkdir(path.dirname(targetPath), { recursive: true })
            await fs.writeFile(targetPath, content, 'utf8')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                ok: true,
                path: path.relative(process.cwd(), targetPath).replace(/\\/g, '/'),
              }),
            )
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                ok: false,
                error: error?.message || 'Falha ao salvar banco principal.',
              }),
            )
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE || '/',
  plugins: [react(), statementDbSavePlugin()],
})
