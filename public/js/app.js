document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('generateBtn');
    var errorMsg = document.getElementById('errorMsg');
    var strengthFill = document.getElementById('strengthFill');
    var strengthLabel = document.getElementById('strengthLabel');
    var userLenInput = document.getElementById('usernameLength');
    var passLenInput = document.getElementById('passwordLength');

    // --- Generar credenciales ---
    btn.addEventListener('click', async function () {
        btn.disabled = true;
        btn.textContent = 'Generando...';
        errorMsg.style.display = 'none';

        var passLen = parseInt(passLenInput.value, 10) || 20;
        var userLen = parseInt(userLenInput.value, 10) || 10;

        try {
            var url = '/api/generate-credentials?passwordLength=' + passLen + '&usernameLength=' + userLen;
            var response = await fetch(url, { method: 'POST' });

            if (!response.ok) {
                var errData = await response.json().catch(function () { return {}; });
                throw new Error(errData.error || 'Error del servidor: ' + response.status);
            }

            var data = await response.json();
            document.getElementById('username').textContent = data.username;
            document.getElementById('password').textContent = data.password;

            updateStrength(data.password);
        } catch (error) {
            console.error('Error:', error);
            errorMsg.textContent = error.message || 'Error al generar credenciales.';
            errorMsg.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generar Nuevas Credenciales';
        }
    });

    // --- Copiar al portapapeles ---
    document.querySelectorAll('.copy-btn').forEach(function (copyBtn) {
        copyBtn.addEventListener('click', function () {
            var targetId = this.getAttribute('data-target');
            var text = document.getElementById(targetId).textContent;
            var button = this;

            if (text.indexOf('Haz clic') !== -1) return;

            navigator.clipboard.writeText(text).then(function () {
                showCopied(button);
            }).catch(function () {
                // Fallback para navegadores sin clipboard API
                var textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showCopied(button);
            });
        });
    });

    function showCopied(button) {
        button.textContent = 'Copiado';
        button.classList.add('copied');
        setTimeout(function () {
            button.textContent = 'Copiar';
            button.classList.remove('copied');
        }, 2000);
    }

    // --- Indicador de fortaleza ---
    function updateStrength(password) {
        var score = 0;
        var len = password.length;

        if (len >= 8) score++;
        if (len >= 12) score++;
        if (len >= 20) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        var percent, color, label;
        if (score <= 2) {
            percent = 25; color = '#dc3545'; label = 'Debil';
        } else if (score <= 4) {
            percent = 50; color = '#ffc107'; label = 'Media';
        } else if (score <= 5) {
            percent = 75; color = '#28a745'; label = 'Fuerte';
        } else {
            percent = 100; color = '#155724'; label = 'Muy fuerte';
        }

        strengthFill.style.width = percent + '%';
        strengthFill.style.background = color;
        strengthLabel.textContent = 'Fortaleza: ' + label + ' (' + len + ' caracteres)';
    }
});
