<?php

namespace App\Providers;

use App\Scan\Scanner;
use App\Scan\SimulatedScanner;
use App\Sms\LogSmsSender;
use App\Sms\SmsSender;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SmsSender::class, LogSmsSender::class);
        $this->app->bind(Scanner::class, SimulatedScanner::class);
    }

    public function boot(): void
    {
        $key = fn (Request $r) => $r->user()?->id ?: $r->ip();

        RateLimiter::for('login', fn (Request $r) => [
            Limit::perMinute(10)->by($r->ip()),
            Limit::perMinute(5)->by(mb_strtolower((string) $r->input('email')).'|'.$r->ip()),
        ]);
        RateLimiter::for('otp', fn (Request $r) => [Limit::perMinute(5)->by($r->ip()), Limit::perHour(20)->by($r->ip())]);
        RateLimiter::for('checkout', fn (Request $r) => Limit::perMinute(10)->by($key($r)));
        RateLimiter::for('downloads', fn (Request $r) => Limit::perMinute(30)->by($key($r)));
        RateLimiter::for('contact', fn (Request $r) => Limit::perHour(10)->by($r->ip()));
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(240)->by($key($r)));
    }
}
