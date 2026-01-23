import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// ==================== CALENDAR EVENTS ====================

// Get calendar events
router.get('/events', async (req: AuthRequest, res) => {
  try {
    const { start, end } = req.query;
    const userId = req.user!.id;

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: start ? new Date(start as string) : undefined,
          lte: end ? new Date(end as string) : undefined
        }
      },
      include: {
        deal: { select: { id: true, title: true, stage: true } },
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        activity: { select: { id: true, type: true, description: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

// Create calendar event
router.post('/events', async (req: AuthRequest, res) => {
  try {
    const { title, description, startTime, endTime, location, attendees, dealId, contactId, activityId, color, isAllDay } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    // Validate time logic
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees: attendees ? JSON.stringify(attendees) : null,
        dealId: dealId || null,
        contactId: contactId || null,
        activityId: activityId || null,
        color: color || '#3B82F6',
        isAllDay: isAllDay || false,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        activity: { select: { id: true, type: true } }
      }
    });

    res.status(201).json(calendarEvent);
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Update calendar event
router.put('/events/:id', async (req: AuthRequest, res) => {
  try {
    const { title, description, startTime, endTime, location, attendees, color, isAllDay, status } = req.body;
    const userId = req.user!.id;

    const calendarEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id as string,
        userId
      }
    });

    if (!calendarEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: req.params.id as string },
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees: attendees ? JSON.stringify(attendees) : null,
        color: color || calendarEvent.color,
        isAllDay: isAllDay !== undefined ? isAllDay : calendarEvent.isAllDay,
        status: status || calendarEvent.status,
      },
      include: {
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        activity: { select: { id: true, type: true } }
      }
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// Delete calendar event
router.delete('/events/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const calendarEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: req.params.id as string,
        userId
      }
    });

    if (!calendarEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await prisma.calendarEvent.delete({
      where: { id: req.params.id as string }
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

// ==================== AUTO SYNC ====================

// Sync deal to calendar event
router.post('/sync/deal/:dealId', async (req: AuthRequest, res) => {
  try {
    const { dealId } = req.params;
    const { startTime, endTime, title, description, location, attendees } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    // Validate time logic
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId as string },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        owner: { select: { name: true, email: true } }
      }
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if event already exists for this deal
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        userId,
        dealId: dealId as string
      }
    });

    if (existingEvent) {
      // UPDATE existing event instead of erroring
      const updatedEvent = await prisma.calendarEvent.update({
        where: { id: existingEvent.id },
        data: {
          title: title || existingEvent.title,
          description: description || existingEvent.description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location: location || existingEvent.location,
          attendees: attendees ? JSON.stringify(attendees) : existingEvent.attendees,
        }
      });
      return res.json(updatedEvent);
    }

    const eventTitle = title || `นัดหมาย: ${deal.title}`;
    const eventDescription = description || `นัดหมายกับ ${deal.contact?.firstName} ${deal.contact?.lastName}`;
    const eventAttendees = attendees || [
      deal.contact?.email,
      deal.owner?.email
    ].filter(Boolean);

    // Create calendar event in our system
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId,
        title: eventTitle,
        description: eventDescription,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees: JSON.stringify(eventAttendees),
        dealId: dealId as string,
      }
    });

    res.status(201).json(calendarEvent);
  } catch (error) {
    console.error('Sync deal to calendar error:', error);
    res.status(500).json({ error: 'Failed to sync deal to calendar' });
  }
});

// Get calendar statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalEvents, thisMonthEvents, upcomingEvents] = await Promise.all([
      prisma.calendarEvent.count({ where: { userId } }),
      prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: now }
        }
      })
    ]);

    res.json({
      totalEvents,
      thisMonthEvents,
      upcomingEvents
    });
  } catch (error) {
    console.error('Get calendar stats error:', error);
    res.status(500).json({ error: 'Failed to get calendar stats' });
  }
});

export default router;
