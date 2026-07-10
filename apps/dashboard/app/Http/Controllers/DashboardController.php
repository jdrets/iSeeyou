<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Dashboard/Index');
    }

    public function logs(): Response
    {
        return Inertia::render('Logs/Index');
    }
}
