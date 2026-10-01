<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /** Requête « stateful » comme celles du frontend (session Sanctum). */
    protected function fromFrontend(): static
    {
        return $this->withHeader('Referer', 'http://localhost:3000/');
    }

    protected function as(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
