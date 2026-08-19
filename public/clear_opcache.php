<?php
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OPcache foi limpo com sucesso!";
} else {
    echo "OPcache nao esta habilitado no servidor.";
}
