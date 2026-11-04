# ============================================================
# Service de capture d'ecran pour Production Adjointe
# Ecoute sur http://localhost:9098
# Capture tous les ecrans et renvoie l'image en base64
# ============================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$port = 9098
$prefix = "http://localhost:${port}/"

# Verifier si le port est deja utilise
try {
    $testConn = New-Object System.Net.Sockets.TcpClient
    $testConn.Connect("localhost", $port)
    $testConn.Close()
    # Si on arrive ici, le port est deja pris = service deja actif
    Write-Host "Le service tourne deja sur le port $port."
    exit 0
} catch {
    # Port libre, on continue
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Erreur: impossible de demarrer le serveur sur $prefix"
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "=== Service Emplacement actif sur $prefix ==="
Write-Host "En attente de requetes..."

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS headers (le site est en HTTPS, on autorise les requetes cross-origin)
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        # Preflight OPTIONS
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        $path = $request.Url.AbsolutePath

        if ($path -eq "/health") {
            # Health check
            $response.ContentType = "application/json"
            $body = '{"status":"ok","service":"emplacement-capture"}'
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($body)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
        }
        elseif ($path -eq "/capture") {
            Write-Host "$(Get-Date -Format 'HH:mm:ss') - Capture en cours..."

            try {
                # Recuperer les dimensions de tous les ecrans
                $screens = [System.Windows.Forms.Screen]::AllScreens
                $minX = ($screens | ForEach-Object { $_.Bounds.X } | Measure-Object -Minimum).Minimum
                $minY = ($screens | ForEach-Object { $_.Bounds.Y } | Measure-Object -Minimum).Minimum
                $maxX = ($screens | ForEach-Object { $_.Bounds.X + $_.Bounds.Width } | Measure-Object -Maximum).Maximum
                $maxY = ($screens | ForEach-Object { $_.Bounds.Y + $_.Bounds.Height } | Measure-Object -Maximum).Maximum
                $totalWidth = $maxX - $minX
                $totalHeight = $maxY - $minY

                # Capturer tous les ecrans
                $bitmap = New-Object System.Drawing.Bitmap($totalWidth, $totalHeight)
                $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                $graphics.CopyFromScreen($minX, $minY, 0, 0, (New-Object System.Drawing.Size($totalWidth, $totalHeight)))
                $graphics.Dispose()

                # Convertir en JPEG (plus compact que PNG pour le transfert)
                $stream = New-Object System.IO.MemoryStream
                $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
                $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
                $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]85)
                $bitmap.Save($stream, $jpegCodec, $encoderParams)
                $bitmap.Dispose()

                $base64 = [Convert]::ToBase64String($stream.ToArray())
                $stream.Dispose()

                # Reponse JSON avec le base64
                $response.ContentType = "application/json"
                $body = "{`"image`":`"data:image/jpeg;base64,$base64`",`"width`":$totalWidth,`"height`":$totalHeight}"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($body)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()

                Write-Host "$(Get-Date -Format 'HH:mm:ss') - Capture envoyee (${totalWidth}x${totalHeight})"
            }
            catch {
                Write-Host "Erreur capture: $($_.Exception.Message)"
                $response.StatusCode = 500
                $response.ContentType = "application/json"
                $errBody = "{`"error`":`"$($_.Exception.Message)`"}"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($errBody)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
            }
        }
        else {
            # 404
            $response.StatusCode = 404
            $response.Close()
        }
    }
    catch {
        # Erreur de connexion, on continue
        Write-Host "Erreur: $($_.Exception.Message)"
    }
}
