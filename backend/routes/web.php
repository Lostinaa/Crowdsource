<?php

use Illuminate\Support\Facades\Route;

// This handles the redirect correctly
//Route::redirect('/admin/login', '/admin/register');

Route::get('/', function () {
    return view('welcome');
});