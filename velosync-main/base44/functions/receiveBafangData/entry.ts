import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      activity_id,
      bike_id,
      data_type,
      value,
      unit,
      raw_data,
      timestamp,
    } = body;

    // Validera input
    if (!activity_id || !data_type || value === undefined) {
      return Response.json(
        { error: 'Missing required fields: activity_id, data_type, value' },
        { status: 400 }
      );
    }

    // Spara Bafang-data till databasen
    const bafangData = await base44.entities.BafangData.create({
      activity_id,
      bike_id: bike_id || null,
      timestamp: timestamp || new Date().toISOString(),
      data_type,
      value,
      unit: unit || '',
      raw_data: raw_data || null,
      interpreted: true,
      source: 'ble',
    });

    return Response.json({
      success: true,
      data_id: bafangData.id,
      message: `Bafang data received: ${data_type} = ${value} ${unit || ''}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});