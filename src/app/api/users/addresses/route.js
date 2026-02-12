import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';

const ADDRESSES_COLLECTION = 'user_addresses';

function sortAddresses(addresses) {
  return addresses.sort((a, b) => {
    if (Boolean(a.is_default) !== Boolean(b.is_default)) {
      return a.is_default ? -1 : 1;
    }
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
}

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

    const snapshot = await db.collection(ADDRESSES_COLLECTION).where('user_id', '==', user.id).get();
    const addresses = sortAddresses(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
    );

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

    const now = new Date().toISOString();
    const batch = db.batch();

    if (is_default) {
      const defaultsSnapshot = await db
        .collection(ADDRESSES_COLLECTION)
        .where('user_id', '==', user.id)
        .where('address_type', '==', address_type)
        .where('is_default', '==', true)
        .get();

      defaultsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          is_default: false,
          updated_at: now
        });
      });
    }

    const docRef = db.collection(ADDRESSES_COLLECTION).doc();
    const addressPayload = {
      user_id: user.id,
      address_type,
      is_default: Boolean(is_default),
      first_name,
      last_name,
      company: company || null,
      address_line_1,
      address_line_2: address_line_2 || null,
      city,
      state,
      postal_code,
      country,
      phone: phone || null,
      created_at: now,
      updated_at: now
    };

    batch.set(docRef, addressPayload);
    await batch.commit();

    const result = {
      id: docRef.id,
      ...addressPayload
    };

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

    const existingAddressDoc = await db.collection(ADDRESSES_COLLECTION).doc(address_id).get();
    const existingAddress = existingAddressDoc.exists ? { id: existingAddressDoc.id, ...existingAddressDoc.data() } : null;

    if (!existingAddress || existingAddress.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const nextAddressType = address_type ?? existingAddress.address_type ?? 'shipping';
    const nextIsDefault = is_default !== undefined ? Boolean(is_default) : Boolean(existingAddress.is_default);
    const batch = db.batch();

    if (nextIsDefault) {
      const defaultsSnapshot = await db
        .collection(ADDRESSES_COLLECTION)
        .where('user_id', '==', user.id)
        .where('address_type', '==', nextAddressType)
        .where('is_default', '==', true)
        .get();

      defaultsSnapshot.docs.forEach((doc) => {
        if (doc.id !== address_id) {
          batch.update(doc.ref, {
            is_default: false,
            updated_at: now
          });
        }
      });
    }

    const updatedPayload = {
      address_type: nextAddressType,
      is_default: nextIsDefault,
      first_name: first_name ?? existingAddress.first_name,
      last_name: last_name ?? existingAddress.last_name,
      company: company ?? existingAddress.company ?? null,
      address_line_1: address_line_1 ?? existingAddress.address_line_1,
      address_line_2: address_line_2 ?? existingAddress.address_line_2 ?? null,
      city: city ?? existingAddress.city,
      state: state ?? existingAddress.state,
      postal_code: postal_code ?? existingAddress.postal_code,
      country: country ?? existingAddress.country ?? 'Mexico',
      phone: phone ?? existingAddress.phone ?? null,
      updated_at: now
    };

    batch.update(existingAddressDoc.ref, updatedPayload);
    await batch.commit();

    const result = {
      ...existingAddress,
      ...updatedPayload
    };

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

    const existingAddressDoc = await db.collection(ADDRESSES_COLLECTION).doc(addressId).get();
    const existingAddress = existingAddressDoc.exists ? { id: existingAddressDoc.id, ...existingAddressDoc.data() } : null;

    if (!existingAddress || existingAddress.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    await existingAddressDoc.ref.delete();

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
