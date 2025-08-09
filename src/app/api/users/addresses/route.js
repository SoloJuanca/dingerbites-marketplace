import { NextResponse } from 'next/server';
import { getRows, getRow, query, transaction } from '../../../../lib/database';
import { authenticateUser } from '../../../../lib/auth';

// GET /api/users/addresses - Get user addresses
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const addressesQuery = `
      SELECT id, address_type, is_default, first_name, last_name, company,
             address_line_1, address_line_2, city, state, postal_code, 
             country, phone, created_at
      FROM user_addresses 
      WHERE user_id = $1 
      ORDER BY is_default DESC, created_at DESC
    `;

    const addresses = await getRows(addressesQuery, [user.id]);

    return NextResponse.json({
      addresses
    });

  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

// POST /api/users/addresses - Create new address
export async function POST(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      address_type = 'shipping',
      is_default = false,
      first_name,
      last_name,
      company,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country = 'Mexico',
      phone
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !address_line_1 || !city || !state || !postal_code) {
      return NextResponse.json(
        { error: 'First name, last name, address line 1, city, state, and postal code are required' },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      // If this address is set as default, unset other default addresses
      if (is_default) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND address_type = $2',
          [user.id, address_type]
        );
      }

      // Create new address
      const createAddressQuery = `
        INSERT INTO user_addresses (
          user_id, address_type, is_default, first_name, last_name, company,
          address_line_1, address_line_2, city, state, postal_code, country, phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const address = await client.query(createAddressQuery, [
        user.id,
        address_type,
        is_default,
        first_name,
        last_name,
        company || null,
        address_line_1,
        address_line_2 || null,
        city,
        state,
        postal_code,
        country,
        phone || null
      ]);

      return address.rows[0];
    });

    return NextResponse.json({
      address: result,
      message: 'Address created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500 }
    );
  }
}

// PUT /api/users/addresses - Update address
export async function PUT(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      address_id,
      address_type,
      is_default,
      first_name,
      last_name,
      company,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      phone
    } = body;

    if (!address_id) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    // Verify that the address belongs to the user
    const existingAddress = await getRow(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [address_id, user.id]
    );

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    const result = await transaction(async (client) => {
      // If this address is set as default, unset other default addresses
      if (is_default) {
        await client.query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND address_type = $2 AND id != $3',
          [user.id, address_type, address_id]
        );
      }

      // Update address
      const updateAddressQuery = `
        UPDATE user_addresses SET
          address_type = $1, is_default = $2, first_name = $3, last_name = $4,
          company = $5, address_line_1 = $6, address_line_2 = $7, city = $8,
          state = $9, postal_code = $10, country = $11, phone = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $13 AND user_id = $14
        RETURNING *
      `;

      const address = await client.query(updateAddressQuery, [
        address_type,
        is_default,
        first_name,
        last_name,
        company || null,
        address_line_1,
        address_line_2 || null,
        city,
        state,
        postal_code,
        country,
        phone || null,
        address_id,
        user.id
      ]);

      return address.rows[0];
    });

    return NextResponse.json({
      address: result,
      message: 'Address updated successfully'
    });

  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/addresses - Delete address
export async function DELETE(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('address_id');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    // Verify that the address belongs to the user
    const existingAddress = await getRow(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, user.id]
    );

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    await query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, user.id]
    );

    return NextResponse.json({
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
