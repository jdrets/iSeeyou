<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/logs', [DashboardController::class, 'logs'])->name('logs');

    Route::prefix('api')->group(function () {
        Route::get('/stats', [AnalyticsController::class, 'stats'])->name('api.stats');
        Route::get('/logs', [AnalyticsController::class, 'logs'])->name('api.logs');
        Route::get('/logs/{type}/{id}', [AnalyticsController::class, 'show'])->name('api.logs.show');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

require __DIR__.'/auth.php';
