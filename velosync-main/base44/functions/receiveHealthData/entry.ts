import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { activity_id, measurement_type, value, unit } = body;

    if (!activity_id || !measurement_type || value === undefined) {
      return Response.json(
        { error: 'Missing required fields: activity_id, measurement_type, value' },
        { status: 400 }
      );
    }

    const measurement = await base44.entities.HealthMeasurement.create({
      activity_id,
      measurement_type,
      value,
      unit: unit || '',
      source_id: user.id,
      timestamp: new Date().toISOString(),
      sync_status: 'synced',
    });

    return Response.json({ success: true, id: measurement.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});