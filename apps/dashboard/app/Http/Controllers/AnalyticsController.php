<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics,
    ) {}

    public function stats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        try {
            $counts = $this->analytics->counts(
                $validated['from'] ?? null,
                $validated['to'] ?? null,
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json($counts);
    }

    public function logs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:error,log,all'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            $result = $this->analytics->logs(
                $validated['type'] ?? null,
                $validated['from'] ?? null,
                $validated['to'] ?? null,
                (int) ($validated['page'] ?? 1),
                (int) ($validated['per_page'] ?? 25),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json($result);
    }

    public function show(Request $request, string $type, string $id): JsonResponse
    {
        $request->merge(['type' => $type, 'id' => $id]);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:error,log'],
            'id' => ['required', 'uuid'],
        ]);

        try {
            $log = $this->analytics->findLog($validated['type'], $validated['id']);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if ($log === null) {
            return response()->json(['message' => 'Log not found.'], 404);
        }

        return response()->json($log);
    }
}
